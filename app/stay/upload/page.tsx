"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const AMENITY_OPTIONS = ["Wifi", "Laundry", "Furnished", "Parking", "Water included", "Electricity included"];
const ROOM_TYPES = ["Bachelor", "Private room", "Shared room", "Studio"];

type Unit = {
  roomType: string;
  price: string;
  file: File | null;
  preview: string | null;
};

export default function UploadRoom() {
  const [isResidence, setIsResidence] = useState(false);
  const [title, setTitle] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [area, setArea] = useState("");
  const [distanceFromCampus, setDistanceFromCampus] = useState("");
  const [price, setPrice] = useState("");
  const [roomType, setRoomType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [units, setUnits] = useState<Unit[]>([{ roomType: "", price: "", file: null, preview: null }]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  function toggleAmenity(amenity: string) {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  }

  function addUnit() {
    setUnits([...units, { roomType: "", price: "", file: null, preview: null }]);
  }

  function updateUnit(index: number, field: "roomType" | "price", value: string) {
    const updated = [...units];
    updated[index][field] = value;
    setUnits(updated);
  }

  function updateUnitFile(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      const updated = [...units];
      updated[index].file = selected;
      updated[index].preview = URL.createObjectURL(selected);
      setUnits(updated);
    }
  }

  function removeUnit(index: number) {
    setUnits(units.filter((_, i) => i !== index));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  }

  async function uploadPhoto(fileToUpload: File) {
    const fileName = `${Date.now()}-${fileToUpload.name}`;
    const { error } = await supabase.storage.from("photos").upload(fileName, fileToUpload);

    if (error) return null;

    const { data } = supabase.storage.from("photos").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handlePost() {
    setUploading(true);

    let imageUrl = null;

    if (file) {
      imageUrl = await uploadPhoto(file);
    }

    const { data: sessionData } = await supabase.auth.getSession();

    const { data: newListing, error: insertError } = await supabase
      .from("listings")
      .insert({
        title,
        service_provider: serviceProvider,
        area,
        distance_from_campus: distanceFromCampus,
        price: isResidence ? null : price,
        room_type: isResidence ? null : roomType,
        image_url: imageUrl,
        user_id: sessionData.session?.user.id,
        amenities: selectedAmenities.join(", "),
        available_from: availableFrom,
        is_residence: isResidence,
        phone_number: phoneNumber,
      })
      .select()
      .single();

    if (insertError || !newListing) {
      alert("Listing failed to save: " + insertError?.message);
      setUploading(false);
      return;
    }

    if (isResidence) {
      const validUnits = units.filter((u) => u.roomType.trim() !== "" && u.price.trim() !== "");

      for (const unit of validUnits) {
        let unitImageUrl = null;
        if (unit.file) {
          unitImageUrl = await uploadPhoto(unit.file);
        }

        await supabase.from("listing_units").insert({
          listing_id: newListing.id,
          room_type: unit.roomType,
          price: unit.price,
          image_url: unitImageUrl,
        });
      }
    }

    setUploading(false);
    router.push("/stay");
  }

  const canPost = isResidence
    ? title.trim() !== "" &&
      area.trim() !== "" &&
      phoneNumber.trim() !== "" &&
      units.some((u) => u.roomType.trim() !== "" && u.price.trim() !== "")
    : title.trim() !== "" &&
      area.trim() !== "" &&
      price.trim() !== "" &&
      roomType.trim() !== "" &&
      phoneNumber.trim() !== "";

  return (
    <main className="min-h-screen bg-[#F6F7F9] text-[#14161F] px-6 py-8">

      <div className="flex justify-between items-center">
        <Link href="/stay">
          <span className="text-[#6B7280] font-medium cursor-pointer">Cancel</span>
        </Link>
        <h1 className="text-2xl font-bold">List Accommodation</h1>
        <div className="w-14"></div>
      </div>

      <p className="text-[#6B7280] mt-2">
        Give students the details they need to know if it&apos;s a fit.
      </p>

      <label className="flex items-center gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={isResidence}
          onChange={(e) => setIsResidence(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm font-medium">This is a residence with multiple room types</span>
      </label>

      <div className="mt-6 flex flex-col gap-4 max-w-sm">
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-2xl"
          />
        )}

        <label className="inline-block bg-white border border-[#E5E7EB] px-4 py-2 rounded-xl font-medium cursor-pointer hover:border-[#4F46E5] transition text-center">
          📷 {preview ? "Change cover photo" : "Add cover photo"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        <div>
          <label className="text-sm font-medium">Property name</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isResidence ? "e.g. Sunrise Student Residence" : "e.g. Fresh properties"}
            className="w-full mt-1 bg-white border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Service provider (optional)</label>
          <input
            value={serviceProvider}
            onChange={(e) => setServiceProvider(e.target.value)}
            placeholder="e.g. Campus Living, or leave blank"
            className="w-full mt-1 bg-white border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Area</label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Universitas, Willows"
            className="w-full mt-1 bg-white border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Distance from campus</label>
          <input
            value={distanceFromCampus}
            onChange={(e) => setDistanceFromCampus(e.target.value)}
            placeholder="e.g. 5 min walk"
            className="w-full mt-1 bg-white border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <div>
          <label className="text-sm font-medium">WhatsApp number</label>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 0812345678"
            className="w-full mt-1 bg-white border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:border-[#4F46E5]"
          />
          <p className="text-[#6B7280] text-xs mt-1">Students will message you here about this listing.</p>
        </div>

        {!isResidence ? (
          <>
            <div>
              <label className="text-sm font-medium">Room type</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full mt-1 bg-white border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">Select a type</option>
                {ROOM_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Price per month</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. R2,800/mo"
                className="w-full mt-1 bg-white border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="text-sm font-medium">Room types available</label>

            <div className="flex flex-col gap-4 mt-2">
              {units.map((unit, index) => (
                <div key={index} className="bg-white border border-[#E5E7EB] rounded-xl p-3">
                  {unit.preview && (
                    <img
                      src={unit.preview}
                      alt="Room type preview"
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                  )}

                  <label className="inline-block bg-[#F6F7F9] px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer mb-2">
                    📷 {unit.preview ? "Change photo" : "Add photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => updateUnitFile(index, e)}
                      className="hidden"
                    />
                  </label>

                  <div className="flex gap-2">
                    <select
                      value={unit.roomType}
                      onChange={(e) => updateUnit(index, "roomType", e.target.value)}
                      className="flex-1 bg-white border border-[#E5E7EB] rounded-xl p-2 text-sm focus:outline-none focus:border-[#4F46E5]"
                    >
                      <option value="">Select type</option>
                      {ROOM_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    <input
                      value={unit.price}
                      onChange={(e) => updateUnit(index, "price", e.target.value)}
                      placeholder="R2,800/mo"
                      className="w-32 bg-white border border-[#E5E7EB] rounded-xl p-2 text-sm focus:outline-none focus:border-[#4F46E5]"
                    />

                    {units.length > 1 && (
                      <button
                        onClick={() => removeUnit(index)}
                        className="text-red-500 text-sm px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addUnit}
              className="mt-2 text-[#4F46E5] text-sm font-medium"
            >
              + Add another room type
            </button>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Available from</label>
          <input
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            placeholder="e.g. Jan 2027"
            className="w-full mt-1 bg-white border border-[#E5E7EB] rounded-xl p-3 focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Amenities</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {AMENITY_OPTIONS.map((amenity) => (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={
                  selectedAmenities.includes(amenity)
                    ? "bg-[#4F46E5] text-white px-3 py-1.5 rounded-full text-sm font-medium"
                    : "bg-white border border-[#E5E7EB] text-[#6B7280] px-3 py-1.5 rounded-full text-sm font-medium"
                }
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handlePost}
        disabled={!canPost || uploading}
        className="mt-6 bg-[#4F46E5] text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#4338CA] transition"
      >
        {uploading ? "Posting..." : "List Accommodation"}
      </button>
    </main>
  );
}